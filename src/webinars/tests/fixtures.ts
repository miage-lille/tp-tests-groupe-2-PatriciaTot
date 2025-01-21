import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { User } from 'src/users/entities/user.entity';

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