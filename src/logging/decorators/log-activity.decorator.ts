import { SetMetadata } from '@nestjs/common';

export const ACTIVITY_KEY = 'activity';
export const LogActivity = (action: string) => SetMetadata(ACTIVITY_KEY, action); 