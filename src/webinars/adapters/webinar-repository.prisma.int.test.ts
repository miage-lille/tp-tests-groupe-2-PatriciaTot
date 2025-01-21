import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';

const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  // Avant le lancement des tests, on se connecte à la base de données et on exécute les migrations
  beforeAll(async () => {
    // Connect to database
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // Run migrations to populate the database
    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);

    return prismaClient.$connect();
  });

  // Avant chaque test, on crée une nouvelle instance du repository et on supprime toutes les données de la table "Webinar"
  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  // Après tous les tests, on arrête le conteneur Docker et on se déconnecte de la base de données
  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    return prismaClient.$disconnect();
  });

  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
  
      // ACT  
      await repository.create(webinar);
  
      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario : repository.findById', () => {
    it('should find a webinar by its ID', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
  
      await prismaClient.webinar.create({
        data: {
          id: webinar.props.id,
          organizerId: webinar.props.organizerId,
          title: webinar.props.title,
          startDate: webinar.props.startDate,
          endDate: webinar.props.endDate,
          seats: webinar.props.seats,
        },
      });
  
      // ACT
      const foundWebinar = await repository.findById('webinar-id');
  
      // ASSERT
      expect(foundWebinar).toEqual(
        new Webinar({
          id: 'webinar-id',
          organizerId: 'organizer-id',
          title: 'Webinar title',
          startDate: new Date('2022-01-01T00:00:00Z'),
          endDate: new Date('2022-01-01T01:00:00Z'),
          seats: 100,
        })
      );
    });
  
    it('should return null if the webinar does not exist', async () => {
      // ACT
      const foundWebinar = await repository.findById('non-existent-id');
  
      // ASSERT
      expect(foundWebinar).toBeNull();
    });
  });

  describe('Scenario : repository.update', () => {
    it('should update an existing webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Original title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
  
      await prismaClient.webinar.create({
        data: {
          id: webinar.props.id,
          organizerId: webinar.props.organizerId,
          title: webinar.props.title,
          startDate: webinar.props.startDate,
          endDate: webinar.props.endDate,
          seats: webinar.props.seats,
        },
      });
  
      const updatedWebinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Updated title',
        startDate: new Date('2022-01-02T00:00:00Z'),
        endDate: new Date('2022-01-02T01:00:00Z'),
        seats: 200,
      });
  
      // ACT
      await repository.update(updatedWebinar);
  
      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Updated title',
        startDate: new Date('2022-01-02T00:00:00Z'),
        endDate: new Date('2022-01-02T01:00:00Z'),
        seats: 200,
      });
    });
  
    it('should throw an error if the webinar does not exist', async () => {
      // ARRANGE
      const nonExistentWebinar = new Webinar({
        id: 'non-existent-id',
        organizerId: 'organizer-id',
        title: 'Non-existent webinar',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
  
      // ACT & ASSERT
      await expect(repository.update(nonExistentWebinar)).rejects.toThrow();
    });
  });
  

});

