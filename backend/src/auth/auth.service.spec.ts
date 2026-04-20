import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { get } from 'http';
import { getRepositoryToken } from '@nestjs/typeorm';
import { userEntity } from 'src/entities/user.entity';
import { refeshTokenEntity } from 'src/entities/refreshtoken.entity';
import { JwtModule} from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<userEntity>;
  let refreshTokenRepository: Repository<refeshTokenEntity>;
  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockRefreshTokenRepository = {
    findOne : jest.fn(),
    save : jest.fn(),
    create : jest.fn(),
    delete: jest.fn(),
  };
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({
        secret: 'testSecret',
        signOptions: { expiresIn: '1h' },
      })],
      providers: [AuthService , {
        provide: getRepositoryToken(userEntity),
        useValue: mockUserRepository
      },
      {
        provide: getRepositoryToken(refeshTokenEntity),
        useValue: mockRefreshTokenRepository
      },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository= module.get<Repository<userEntity>>(getRepositoryToken(userEntity));
    refreshTokenRepository = module.get<Repository<refeshTokenEntity>>(getRepositoryToken(refeshTokenEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it("Should check if repsitoruy is defined", () => {
    expect(userRepository).toBeDefined();
    expect(refreshTokenRepository).toBeDefined();
  });
  describe('register', () => {
    it('should register a new user', async () => {
      
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue({ id: '1', username: 'testuser', password: 'hashedpassword' });
      
      const payload = { username: 'testuser', password: 'password' };
      await service.register(payload);
      
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { username: payload.username } });
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
})});
