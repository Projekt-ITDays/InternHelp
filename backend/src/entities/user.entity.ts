import { Role } from "src/enums/role.enum";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { achievementEntity } from "./achievement.entity";


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

    @Column({ default: 0 })
    experience: number

    @Column({ default: 1 })
    level: number

    @OneToMany(() => achievementEntity, (achievement) => achievement.user)
    achievements: achievementEntity[]
    
}