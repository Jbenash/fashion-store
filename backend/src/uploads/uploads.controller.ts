import { Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CloudinaryService } from './cloudinary.service.js';
import { JwtAuthGuard, Roles, RolesGuard } from '../common/gaurds.js';
import { Role } from '../users/user.entity.js';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UploadsController {
  constructor(private cloudinary: CloudinaryService) {}

  /** Admin-only: hands back a short-lived signature for one direct upload. */
  @Post('signature')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  signature() {
    return this.cloudinary.createUploadSignature();
  }
}
