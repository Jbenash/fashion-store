import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator'

export class RegisterUserDto {

    @IsNotEmpty() @MaxLength(80) name : string; 
    @IsEmail() email: string;
    @MinLength(8) password: string; 

}

export class LoginDto {

    @IsEmail() email: string
    @IsNotEmpty() password: string
}
