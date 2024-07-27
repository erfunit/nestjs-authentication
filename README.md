# NestJS Authentication and Authorization Starter Guide (With Postgres)

## Prerequisites

- Node.js
- NestJS CLI
- PostgreSQL

## 1. Install Necessary Dependencies

First, install NestJS CLI if you haven't already:

```bash
npm install -g @nestjs/cli
```

Then, create a new NestJS project:

```bash
nest new my-nest-app
```

Navigate to the project directory:

```bash
cd my-nest-app
```

Install required dependencies:

```bash
npm install @nestjs/typeorm typeorm pg @nestjs/jwt passport-jwt @nestjs/passport passport bcryptjs
```

Install type definitions for TypeScript:

```bash
npm install @types/bcryptjs @types/passport-jwt
```

## 2. Setting Up Environment Variables

Create a `.env` file at the root of your project with the following content:

```env
DATABASE_HOST=apo.liara.cloud
DATABASE_PORT=31406
DATABASE_USERNAME=root
DATABASE_PASSWORD=A7uLGlW7mawdfWF9B3aNVYeC
DATABASE_NAME=postgres
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

## 3. Main Application Bootstrap

Update your `main.ts` file:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as passport from 'passport';
import * as session from 'express-session';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  // Use session middleware
  app.use(
    session({
      secret: configService.get<string>('SESSION_SECRET'),
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(3000);
}
bootstrap();
```

## 4. AppModule Configuration

Update `app.module.ts` to use environment variables for the database connection:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerMiddleware } from './logger/logger.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import Users from './entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([Users]),
    UsersModule,
    AuthModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

## 5. User Management

### Create the User Entity

Create `user.entity.ts` in the `src/entities` directory:

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export default class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ length: 36, nullable: true })
  name: string;

  @Column({ length: 36, nullable: true })
  lastname: string;

  @Column({ nullable: true })
  age: number;

  // select false means that it never gets back from the SELECT command because of security issues
  @Column({ select: false, nullable: false })
  password: string;
}
```

### Create DTOs

Create `create-user.dto.ts` in the `src/users/dto` directory:

```typescript
export class CreateUserDto {
  email: string;
  name: string;
  lastname: string;
  age: number;
  password: string;
}
```

Create `update-user.dto.ts` in the `src/users/dto` directory:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### Create the Users Controller

Create `users.controller.ts` in the `src/users` directory:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
```

### Create the Users Service

Create `users.service.ts` in the `src/users` directory:

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import Users from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const prevUser = await this.userRepository.find({
      where: { email: createUserDto.email },
    });
    if (prevUser.length > 0) {
      throw new BadRequestException('User already exists');
    }
    await this.userRepository.insert(createUserDto);
    const { password, ...user } = createUserDto;
    return {
      message: 'user created successfully',
      data: user,
    };
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with id #${id} not found!`);
    return user;
  }

  async findOneByEmail(email: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
```

### Register the Users Module

Create `users.module.ts` in the `src/users` directory:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import Users from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

## 6. Authentication and Authorization

### Create DTOs

Create `register.dto.ts` in the `src/auth/dto` directory:

```typescript
export class RegisterDto {
  email: string;
  name: string;
  lastname: string;
  age: number;
  password: string;
}
```

Create `login.dto.ts` in the `src/auth/dto` directory:

```typescript
export class LoginDto {
  email: string;
  password: string;
}
```

### Create the Auth Controller

Create `auth.controller.ts` in the `src/auth` directory:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

### Create the Auth Service

Create `auth.service.ts` in the `src/auth` directory:

```typescript
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
```

### Register the Auth Module

Create `auth.module.ts` in the `src/auth` directory:

```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import Users from 'src/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JWTstrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersService, JWTstrategy],
})
export class AuthModule {}
```

### Create the JWT Strategy and Guard

Create `jwt.strategy.ts` in the `src/auth/strategies` directory:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JWTstrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
```

Create `jwt-auth.guard.ts` in the `src/auth` directory:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

## 7. Running the Application

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the application:**
   ```bash
   npm run start:dev
   ```

The application should now be running, and you can use the provided endpoints for user management, authentication, and authorization.
