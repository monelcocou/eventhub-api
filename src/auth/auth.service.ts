import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { jwtConstants } from './auth.constants';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  // ==========================================
  // 1. REGISTER (Inscription)
  // ==========================================
  async register(registerDto: RegisterDto) {
    // Vérifier que l'email n'existe pas déjà
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: 'user', // Rôle par défaut
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Générer les tokens JWT
    const tokens = await this.generateTokens(user.id, user.email);

    // Sauvegarder le refresh token en BDD
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  // ==========================================
  // 2. LOGIN (Connexion)
  // ==========================================
  async login(loginDto: LoginDto) {
    // Trouver l'utilisateur avec son password
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Comparer les mots de passe
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Générer les tokens JWT
    const tokens = await this.generateTokens(user.id, user.email);

    // Sauvegarder le refresh token en BDD
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Retourner sans le password
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  // ==========================================
  // 3. REFRESH TOKEN (Renouveler l'access token)
  // ==========================================
  async refreshToken(refreshToken: string) {
    try {
      // Vérifier la signature du refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtConstants.refreshSecret,
      });

      // Vérifier que le token existe en BDD
      const tokenExists = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenExists) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Vérifier qu'il n'est pas expiré
      if (tokenExists.expiresAt < new Date()) {
        // Supprimer le token expiré
        await this.prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Générer un nouveau access token
      const newAccessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
        },
        {
          secret: jwtConstants.accessSecret,
          expiresIn: jwtConstants.accessExpiresIn,
        },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ==========================================
  // 4. LOGOUT (Déconnexion)
  // ==========================================
  async logout(refreshToken: string) {
    // Supprimer le refresh token de la BDD
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    return { message: 'Logged out successfully' };
  }

  // ==========================================
  // 5. FORGOT PASSWORD (Mot de passe oublié)
  // ==========================================
  async forgotPassword(email: string) {
    // Trouver l'utilisateur
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Ne pas révéler que l'email n'existe pas (sécurité)
      return { message: 'If this email exists, a reset link has been sent' };
    }

    // Générer un token de reset (UUID)
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expire dans 1 heure

    // Sauvegarder le token de reset
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expiresAt,
      },
    });

    // TODO: Envoyer l'email avec le lien de reset
    // Pour l'instant, on retourne juste le token (à remplacer par l'envoi d'email)
    console.log(`Reset token for ${email}: ${resetToken}`);

    return { message: 'If this email exists, a reset link has been sent' };
  }

  // ==========================================
  // 6. RESET PASSWORD (Réinitialiser le mot de passe)
  // ==========================================
  async resetPassword(token: string, newPassword: string) {
    // Trouver l'utilisateur avec ce token
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(), // Token pas encore expiré
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et supprimer le token de reset
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  // ==========================================
  // MÉTHODES HELPERS (privées)
  // ==========================================

  // Générer access token + refresh token
  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConstants.accessSecret,
      expiresIn: jwtConstants.accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: jwtConstants.refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // Sauvegarder le refresh token en BDD
  private async saveRefreshToken(userId: number, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }
}
