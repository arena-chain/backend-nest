import { Injectable } from '@nestjs/common';

@Injectable()
export class EloService {
    /**
     * Standard Elo formula:
     * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
     * R_A' = R_A + K * (S_A - E_A)
     *
     * S_A = 1 (win), 0 (loss)
     */
    calculate(
        winnerElo: number,
        loserElo: number,
        kFactor: number,
    ): { newWinnerElo: number; newLoserElo: number; winnerChange: number; loserChange: number } {
        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
        const expectedLoser = 1 - expectedWinner;

        const winnerChange = Math.round(kFactor * (1 - expectedWinner));
        const loserChange = Math.round(kFactor * (0 - expectedLoser));

        const newWinnerElo = Math.max(0, winnerElo + winnerChange);
        const newLoserElo = Math.max(0, loserElo + loserChange);

        return { newWinnerElo, newLoserElo, winnerChange, loserChange };
    }

    /**
     * Calculate Elo for a forfeit.
     * Same formula, but an optional extra penalty is applied to the forfeiting team.
     */
    calculateForfeit(
        winnerElo: number,
        loserElo: number,
        kFactor: number,
        extraPenalty: number = 0,
    ): { newWinnerElo: number; newLoserElo: number; winnerChange: number; loserChange: number } {
        const result = this.calculate(winnerElo, loserElo, kFactor);
        const finalLoserElo = Math.max(0, result.newLoserElo - extraPenalty);
        const finalLoserChange = result.loserChange - extraPenalty;
        return {
            newWinnerElo: result.newWinnerElo,
            newLoserElo: finalLoserElo,
            winnerChange: result.winnerChange,
            loserChange: finalLoserChange,
        };
    }

    /**
     * Returns how many game wins are needed to win a series.
     */
    winsNeededForFormat(format: 'BO1' | 'BO3' | 'BO5'): number {
        return { BO1: 1, BO3: 2, BO5: 3 }[format];
    }
}
