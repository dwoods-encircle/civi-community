import { GroupSummary } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Groups: undefined;
  GroupChat: { group: GroupSummary };
};
