import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { testUser } from 'src/users/tests/user-seeds';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';
import { User } from 'src/users/entities/user.entity';
import { expectWebinarToRemainUnchanged, whenUserChangeSeatsWith, thenUpdatedWebinarSeatsShouldBe } from 'src/webinars/tests/fixtures';


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
      await whenUserChangeSeatsWith(useCase, payload);

      // ASSERT
      await thenUpdatedWebinarSeatsShouldBe(webinarRepository, 200);
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
      await expect(whenUserChangeSeatsWith(useCase, payload)).rejects.toThrow(WebinarNotFoundException);
    });

    it('should not modify the existing webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(useCase, payload);
      } catch (error) {}

      // ASSERT
      await expectWebinarToRemainUnchanged(webinarRepository);
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
      await expect(whenUserChangeSeatsWith(useCase, payload)).rejects.toThrow(WebinarNotOrganizerException);
    });

    it('should not modify the existing webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(useCase, payload);
      } catch (error) {}

      // ASSERT
      const existingWebinar = await webinarRepository.findByIdSync('webinar-id');
      await expectWebinarToRemainUnchanged(webinarRepository);
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 50,
    };

    it('should throw WebinarReduceSeatsException', async () => {
      // ACT & ASSERT
      await expect(whenUserChangeSeatsWith(useCase, payload)).rejects.toThrow(WebinarReduceSeatsException);
    });

    it('should not modify the existing webinar', async () => {
      // ACT
      try {
        await whenUserChangeSeatsWith(useCase, payload);
      } catch (error) {}

      // ASSERT
      const existingWebinar = await webinarRepository.findByIdSync('webinar-id');
      await expectWebinarToRemainUnchanged(webinarRepository);
    });
    
    describe('Scenario: change seat to a number > 1000', () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 1001,
      };

      it('should throw WebinarTooManySeatsException', async () => {
        // ACT & ASSERT
        await expect(whenUserChangeSeatsWith(useCase, payload)).rejects.toThrow(WebinarTooManySeatsException);
      });

      it('should not modify the existing webinar', async () => {
        // ACT
        try {
          await whenUserChangeSeatsWith(useCase, payload);
        } catch (error) {}

        // ASSERT
        const existingWebinar = await webinarRepository.findByIdSync('webinar-id');
        await expectWebinarToRemainUnchanged(webinarRepository);
      });
    });


});