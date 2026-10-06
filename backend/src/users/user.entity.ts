import {Column , CreateDateColumn , Entity , PrimaryGeneratedColumn } from 'typeorm'
export enum Role {CUSTOMER = 'CUSTOMER', ADMIN = 'ADMIN'}

@Entity('Users')
export class User {
    @PrimaryGeneratedColumn() id: number
    @Column() name: String 
    @Column({unique: true}) email : string
    @Column({select: false}) password: string 
    @Column({type:'enum', enum: Role, default: Role.CUSTOMER}) role: Role
    @CreateDateColumn() createdAt: Date  
}