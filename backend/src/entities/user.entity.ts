import { Role } from "src/enums/role.enum";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('User')
export class userEntity{
    
    @PrimaryGeneratedColumn('uuid')
    id: string
    @Column()
    username: string
    @Column()
    password: string

    @Column({default: Role.USER , type: 'enum', enum: Role})
    role: Role
    
    
}