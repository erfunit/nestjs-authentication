import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Books from 'src/entities/books.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Books)
    private readonly booksRepository: Repository<Books>,
  ) {}

  async create(createBookDto: CreateBookDto) {
    const prevBook = await this.booksRepository.findOne({
      where: { title: createBookDto.title },
    });
    if (prevBook) throw new BadRequestException('Book Already Exist');
    await this.booksRepository.insert(createBookDto);
    return {
      message: `${createBookDto.title} added to books`,
      data: createBookDto,
    };
  }

  async findAll() {
    return await this.booksRepository.find();
  }

  async findOne(id: number) {
    const book = await this.booksRepository.findOne({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  async update(id: number, updateBookDto: UpdateBookDto) {
    const book = await this.findOne(id);
    const newBook = {
      ...book,
      ...updateBookDto,
    };
    await this.booksRepository.update(id, newBook);
    return {
      message: `updated successfully`,
      data: newBook,
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.booksRepository.delete(id);
    return {
      message: 'deleted successfully',
    };
  }
}
