import { createSignUpData } from '../factories/accounts';
import { accountsRepository } from '../../repositories/accounts.repository';

export async function insertTestUser() {
  const data = createSignUpData();
  return accountsRepository.createNewUser(data);
}
