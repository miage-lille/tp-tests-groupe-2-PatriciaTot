import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import Fastify, { FastifyInstance } from 'fastify';
import { AppContainer } from 'src/container';
import { webinarRoutes } from 'src/webinars/routes';
import { promisify } from 'util';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { User } from 'src/users/entities/user.entity';

const asyncExec = promisify(exec);

export class TestServerFixture {
  private container!: StartedPostgreSqlContainer;
  private prismaClient!: PrismaClient;
  private serverInstance!: FastifyInstance;
  private appContainer!: AppContainer;

  async init() {
    this.container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = this.container.getConnectionUri();

    // Initialiser Prisma et les dépendances
    this.prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);
    await this.prismaClient.$connect();

    // Initialiser le conteneur avec Prisma
    this.appContainer = new AppContainer();
    this.appContainer.init(this.prismaClient);

    // Initialiser le serveur
    this.serverInstance = Fastify({ logger: false });
    await webinarRoutes(this.serverInstance, this.appContainer);
    await this.serverInstance.ready();
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getServer() {
    return this.serverInstance.server;
  }

  async stop() {
    if (this.serverInstance) await this.serverInstance.close();
    if (this.prismaClient) await this.prismaClient.$disconnect();
    if (this.container) await this.container.stop();
  }

  async reset() {
    await this.prismaClient.webinar.deleteMany();
    await this.prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  }
}

  // Utilitaires pour les tests unitaires et d'intégration
  export async function expectWebinarToRemainUnchanged(webinarRepository: InMemoryWebinarRepository) {
    const existingWebinar = await webinarRepository.findById('webinar-id');
    expect(existingWebinar?.props.seats).toEqual(100);
  }

  export async function whenUserChangeSeatsWith(useCase: ChangeSeats, payload: { user: User; webinarId: string; seats: number }) {
    return useCase.execute(payload);
  }

  export async function thenUpdatedWebinarSeatsShouldBe(webinarRepository: InMemoryWebinarRepository, expectedSeats: number) {
    const updatedWebinar = await webinarRepository.findById('webinar-id');
    expect(updatedWebinar?.props.seats).toEqual(expectedSeats);
  }