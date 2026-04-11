import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { userEntity } from "./user.entity";

const deafultDate = () => {
    const date = new Date();
    date.setHours(date.getHours() + 2); 
    return date;

}
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
    @Column({default : () => "CURRENT_TIMESTAMP"})
    createdAt : Date
}

