import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('User')
export class userEntity{
    @PrimaryGeneratedColumn('uuid')
    id: string
    @Column()
    username: string
    @Column()
    password: string

    @Column({default: 'user'})
    role: string
    
    
}