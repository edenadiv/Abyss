#include "AbyssRoulette.h"

static const TSet<int32> RED = { 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36 };

bool UAbyssRoulette::IsRed(int32 Number) { return RED.Contains(Number); }

FAbyssRouletteResult UAbyssRoulette::Spin(const TArray<FAbyssRouletteBet>& Bets)
{
    FAbyssRouletteResult R;
    R.Landed = FMath::RandRange(0, 36);
    R.bRed = IsRed(R.Landed);
    R.bEven = R.Landed != 0 && R.Landed % 2 == 0;

    for (const FAbyssRouletteBet& B : Bets)
    {
        switch (B.Kind)
        {
            case EAbyssRouletteBetKind::Number: R.Delta += (B.Number == R.Landed) ? B.Amount * 35 : -B.Amount; break;
            case EAbyssRouletteBetKind::Red:    R.Delta += R.bRed ? B.Amount : -B.Amount; break;
            case EAbyssRouletteBetKind::Black:  R.Delta += (!R.bRed && R.Landed != 0) ? B.Amount : -B.Amount; break;
            case EAbyssRouletteBetKind::Odd:    R.Delta += (R.Landed != 0 && !R.bEven) ? B.Amount : -B.Amount; break;
            case EAbyssRouletteBetKind::Even:   R.Delta += R.bEven ? B.Amount : -B.Amount; break;
            case EAbyssRouletteBetKind::Low:    R.Delta += (R.Landed >= 1 && R.Landed <= 18) ? B.Amount : -B.Amount; break;
            case EAbyssRouletteBetKind::High:   R.Delta += (R.Landed >= 19 && R.Landed <= 36) ? B.Amount : -B.Amount; break;
        }
    }
    return R;
}
