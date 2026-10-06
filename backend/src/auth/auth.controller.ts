import {Controller, Body , Post } from '@nestjs/common'
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterUserDto } from './auth.dto.js';
import { Throttle } from '@nestjs/throttler';



@Controller('auth')
export class AuthController {

    constructor (private auth: AuthService){}

@Post('register')
register (@Body() dto: RegisterUserDto){
    return this.auth.register(dto);

}

@Throttle({default: { limit:5 , ttl: 60000}})
@Post('login')
login (@Body() dto: LoginDto){
    return this.auth.login(dto);
}

}