import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { LeagueLevel } from '../schemas/league.schema';
import { CONTINENTAL_REGIONS, COUNTRIES } from '../constants/regions.constant';

@ValidatorConstraint({ name: 'IsValidRegion', async: false })
export class IsValidRegionConstraint implements ValidatorConstraintInterface {
    validate(regionId: string, args: ValidationArguments) {
        const object = args.object as any;
        const level = object.level;

        if (!level) return true; // Let the level validation handle missing level if strict, otherwise ignore

        switch (level) {
            case LeagueLevel.INTERNATIONAL:
                return !regionId || regionId === 'Global';
            case LeagueLevel.CONTINENTAL:
                return CONTINENTAL_REGIONS.includes(regionId);
            case LeagueLevel.NATIONAL:
                return COUNTRIES.includes(regionId);
            case LeagueLevel.REGIONAL:
                return !!regionId && regionId.length > 0;
            default:
                return false;
        }
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as any;
        const level = object.level;

        switch (level) {
            case LeagueLevel.INTERNATIONAL:
                return `For INTERNATIONAL leagues, regionId must be 'Global' or empty.`;
            case LeagueLevel.CONTINENTAL:
                return `For CONTINENTAL leagues, regionId must be a valid continent or esports region (e.g. EMEA, Americas, Pacific, CN).`;
            case LeagueLevel.NATIONAL:
                return `For NATIONAL leagues, regionId must be a valid country.`;
            case LeagueLevel.REGIONAL:
                return `For REGIONAL leagues, regionId cannot be empty.`;
            default:
                return `Invalid region for the specified league level.`;
        }
    }
}
