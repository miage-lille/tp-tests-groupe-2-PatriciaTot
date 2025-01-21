import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { testUser } from 'src/users/tests/user-seeds';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

describe('Feature : Change seats', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  // Création d'un webinar de 100 places avec Alice comme organisatrice
  const webinar = new Webinar({
    id: 'webinar-id',
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]); // Ajout du webinar dans le repository
    useCase = new ChangeSeats(webinarRepository); // Création de l'instance du cas d'utilisation
  });
  
  // Tests unitaires

  describe('Scenario: Happy path', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 200,
    };

    it('should change the number of seats for a webinar', async () => {
      // ACT
      await useCase.execute(payload);

      // ASSERT
      const updatedWebinar = await webinarRepository.findById('webinar-id');
      expect(updatedWebinar?.props.seats).toEqual(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'non-existent-webinar-id',
      seats: 200,
    };

    it('should throw WebinarNotFoundException', async () => {
      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(WebinarNotFoundException);
    });

    it('should not modify the existing webinar', async () => {
      // ACT
      try {
        await useCase.execute(payload);
      } catch (error) {}

      // ASSERT
      const existingWebinar = await webinarRepository.findByIdSync('webinar-id');
      expect(existingWebinar?.props.seats).toEqual(100);
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    const payload = {
      user: testUser.bob,
      webinarId: 'webinar-id',
      seats: 200,
    };

    it('should throw WebinarNotOrganizerException', async () => {
      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(WebinarNotOrganizerException);
    });

    it('should not modify the existing webinar', async () => {
      // ACT
      try {
        await useCase.execute(payload);
      } catch (error) {}

      // ASSERT
      const existingWebinar = await webinarRepository.findById('webinar-id');
      expect(existingWebinar?.props.seats).toEqual(100);
    });
  });

});