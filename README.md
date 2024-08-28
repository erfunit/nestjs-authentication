# 🛡️ NestJS Authentication & Authorization Guide (With PostgreSQL) 🐘✨

Welcome to your ultimate starter guide for building robust authentication and authorization in a NestJS application with PostgreSQL. Let’s dive in! 🚀

## Prerequisites 📦

Before we get started, make sure you have the following installed:

- **Node.js** 🟩
- **NestJS CLI** 🛠️
- **PostgreSQL** 🐘

---

## 1️⃣ Install Necessary Dependencies

Let’s kick things off by installing the required tools and dependencies.

### 🌟 Step 1: Install NestJS CLI

If you haven’t installed the NestJS CLI, do so with the following command:

```bash
npm install -g @nestjs/cli
```

### 🌟 Step 2: Create a New Project

Create a fresh NestJS project:

```bash
nest new my-nest-app
```

Navigate into your project directory:

```bash
cd my-nest-app
```

### 🌟 Step 3: Add Required Packages

Add the necessary dependencies:

```bash
npm install @nestjs/typeorm typeorm pg @nestjs/jwt passport-jwt @nestjs/passport passport bcryptjs
```

Add type definitions for TypeScript:

```bash
npm install @types/bcryptjs @types/passport-jwt
```

---

## 2️⃣ Set Up Environment Variables 🛠️

Create a `.env` file in the root of your project to securely store your environment variables:

```env
DATABASE_HOST=your_db_host
DATABASE_PORT=your_db_port
DATABASE_USERNAME=your_db_username
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=your_db_name
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

This file will store critical information like your database credentials and JWT secret.

---

## 3️⃣ Main Application Bootstrap ⚡️

Let’s configure the main application bootstrap file.

Update your `main.ts` to look like this:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as passport from 'passport';
import * as session from 'express-session';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1'); // 🌐 Set global API prefix

  // 🛡️ Use session middleware
  app.use(
    session({
      secret: configService.get<string>('SESSION_SECRET'),
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(3000); // 🚀 Listen on port 3000
}
bootstrap();
```

---

## 4️⃣ AppModule Configuration 🔧

Next, we configure our `AppModule` to establish a connection to PostgreSQL.

Update your `app.module.ts`:

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
    ConfigModule.forRoot({ isGlobal: true }), // 🌍 Global environment configuration
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
        synchronize: true, // ⚠️ Sync entities (be careful in production!)
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
    consumer.apply(LoggerMiddleware).forRoutes('*'); // 📝 Apply logger middleware
  }
}
```

---

## 5️⃣ User Management 👥

Let’s set up user management with a user entity, DTOs, and controllers.

### 🧩 Step 1: Create the User Entity

In the `src/entities` directory, create `user.entity.ts`:

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

  @Column({ select: false, nullable: false })
  password: string; // 🔐 Securely store passwords
}
```

### 🧩 Step 2: Create DTOs

**Create `create-user.dto.ts` in the `src/users/dto` directory:**

```typescript
export class CreateUserDto {
  email: string;
  name: string;
  lastname: string;
  age: number;
  password: string;
}
```

**Create `update-user.dto.ts` in the `src/users/dto` directory:**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### 🧩 Step 3: Create the Users Controller

In the `src/users` directory, create `users.controller.ts`:

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

@Controller('users') // 👥 Manage users via this controller
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

### 🧩 Step 4: Create the Users Service

In the `src/users` directory, create `users.service.ts`:

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
      throw new BadRequestException('User already exists'); // ❌ Prevent duplicate users
    }
    await this.userRepository.insert(createUserDto);
    const { password, ...user } = createUserDto;
    return {
      message: 'user created successfully', // ✅ Confirmation message
      data: user,
    };
  }

  findAll() {
    return this.userRepository.find(); // 📜 Return all users
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with id #${id} not found!`); // ❌ Handle missing user
    return user;
  }

  async findOneByEmail(email: string) {
    return await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // 🔐 Securely compare passwords
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

### 🧩

 Step 5: Register the Users Module

Finally, let’s register the `UsersModule` in `users.module.ts`:

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
  exports: [UsersService], // 🚀 Export UsersService for use in other modules
})
export class UsersModule {}
```

---

## 6️⃣ Authentication Setup 🔐

Now, let’s handle authentication with JWT and Passport.

### 🔑 Step 1: Create the Auth Module

Create the `auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // ⏰ Token expiration time
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy], // 🛡️ Register JwtStrategy
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### 🔑 Step 2: Create the AuthService

Create `auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result; // ✅ User is validated
    }
    throw new UnauthorizedException('Incorrect email or password'); // ❌ Handle invalid credentials
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload), // 🔑 Sign the JWT token
    };
  }

  async register(createUserDto: any) {
    createUserDto.password = await bcrypt.hash(createUserDto.password, 10); // 🔒 Hash password before storing
    const user = await this.usersService.create(createUserDto);
    return this.login(user.data);
  }
}
```

### 🔑 Step 3: Create the JwtStrategy

Create `jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 🛡️ Extract token from Bearer header
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Unauthorized access!'); // ❌ Handle invalid token
    }
    return { id: user.id, email: user.email }; // ✅ Return validated user
  }
}
```

### 🔑 Step 4: Create the AuthController

Create `auth.controller.ts`:

```typescript
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK) // 🎯 Return HTTP 200 on successful login
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto); // 📝 Register a new user
  }
}
```

### 🔑 Step 5: Create the LocalAuthGuard

Create `local-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('jwt') {} // 🛡️ Guard routes with JWT authentication
```

---

## 7️⃣ Protect Routes 🛡️

Finally, protect specific routes using guards.

### 🔐 Step 1: Protect Routes in Users Controller

Update the `users.controller.ts` to protect routes:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard'; // 🛡️ Import JWT Guard

@Controller('users')
@UseGuards(JwtAuthGuard) // 🛡️ Protect all routes in this controller
export class UsersController {
  // Existing methods...
}
```

### 🔐 Step 2: Create the JwtAuthGuard

Create `jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {} // 🛡️ Guard with JWT Strategy
```

---

## 🏁 Wrapping Up

Congrats on setting up authentication and authorization in your NestJS project with PostgreSQL! 🎉 Now your app has a strong foundation for secure operations. Keep building, and feel free to expand upon this setup as your app grows.

**Happy coding!** ✨
