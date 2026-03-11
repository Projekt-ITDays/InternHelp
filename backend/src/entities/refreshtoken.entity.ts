import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity('refresh_tokens')
export class refeshTokenEntity {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    userId: string
    @Column()
    token: string
    @Column()
    expiresAt: Date
}