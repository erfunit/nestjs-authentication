import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.findOneByEmail(registerDto.email);
    if (user) throw new BadRequestException('Username Already exists');
    registerDto.password = await bcrypt.hash(registerDto.password, 10);
    return this.usersService.create(registerDto);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) throw new BadRequestException('Incorrect username or password');

    const passwordMatch = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!passwordMatch)
      throw new BadRequestException('Incorrect username or password');

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.id,
    });

    return {
      accessToken,
    };
  }
}
