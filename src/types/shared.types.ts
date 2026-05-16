import { type NextPage } from 'next';
import { type User } from 'next-auth';

export type NextPageWithUser<T = {}> = NextPage<{ user: User } & T> & { auth: boolean };

export interface PushMessage {
  title: string;
  message: string;
  data?: { url?: string };
}
