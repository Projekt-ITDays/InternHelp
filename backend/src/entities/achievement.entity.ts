import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { userEntity } from "./user.entity";

@Entity('Achievement')
export class achievementEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    userId: string

    @ManyToOne(() => userEntity, (user) => user.achievements, { onDelete: 'CASCADE' })
    user: userEntity

    @Column()
    title: string

    @Column({ nullable: true })
    description: string

    @Column({ default: 10 })
    xpReward: number

    @Column({ default: false })
    completed: boolean

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date

    @CreateDateColumn()
    createdAt: Date
}
