import { createDmActions } from '../../domain/dm/dmStore';
import { localDb } from '../db';
import { createLocalDms } from './localDms';
import { remoteDmRepository } from './RemoteDmRepository';

// Backend DM is done (P2-B3.2 #115): no Fake.
export const dmRepository = remoteDmRepository;
export const localDms = createLocalDms(localDb);

export const dmActions = createDmActions(dmRepository);
