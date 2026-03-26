import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { userEntity } from "./user.entity";

@Entity('surveys')
export class SurveysEntity {
    @PrimaryGeneratedColumn()
    id : number;
    @ManyToOne(() => userEntity, (user) => user.surveys, { onDelete: 'CASCADE' })
    user: userEntity
    @Column()
    userId : string;
    @Column()
    Major : string
    @Column()
    YearOfStudy : number
    @Column()
    PreferredInternshipType : string
    @Column()
    TimeLeft : number
    @Column()
    Inrest : string
    @Column()
    Expierience : string
    @Column()
    skills : string
    @Column()
    AbilitiesLevel : string
    @Column()
    SideProjectsHobby : string
    @Column()
    Strengths : string
    @Column()
    Weaknesses : string
    
    @Column()
    University : string
    @Column()
    GraduationYear : number
}