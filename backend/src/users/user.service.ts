import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  //find user with email 
  findByEmail(email: string) {
    return this.repo.findOneBy({ email });
  }

  //get the user with email - password wont be trasferred through the query 
  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne()
  }

  create (data: Partial <User >){ //make the user property optional 
    return this.repo.save(this.repo.create(data))
  }
}
