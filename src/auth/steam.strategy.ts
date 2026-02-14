import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, 'steam') {
    constructor(private configService: ConfigService) {
        super({
            returnURL: configService.get<string>('STEAM_RETURN_URL') || '',
            realm: configService.get<string>('STEAM_REALM') || '',
            apiKey: configService.get<string>('STEAM_API_KEY') || '',
        });
    }

    async validate(identifier: string, profile: any, done: any): Promise<any> {
        // identifier is the OpenID URL, e.g., https://steamcommunity.com/openid/id/76561198032707202
        // profile contains steamid, personaname, avatar, etc.
        const user = {
            steamId: profile.id,
            nickname: profile.displayName || profile._json.personaname,
            photos: profile.photos,
        };
        done(null, user);
    }
}
