import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('books')
export default class Books {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  title: string;

  @Column({ length: 36, nullable: false })
  author: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: false })
  price: number;
}
