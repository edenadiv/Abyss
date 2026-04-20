#include "AbyssBlackjack.h"

void UAbyssBlackjack::Reset()
{
    Deck = UAbyssDeck::BuildDeck(4);
    UAbyssDeck::Shuffle(Deck);
    State = FAbyssBJState();
}

bool UAbyssBlackjack::PlaceBet(int32 Amount)
{
    if (State.Phase != EAbyssBJPhase::Bet || Amount <= 0) return false;
    State.Bet = Amount;
    return true;
}

void UAbyssBlackjack::Deal()
{
    if (State.Phase != EAbyssBJPhase::Bet || State.Bet <= 0) return;
    if (Deck.Num() < 20) { Deck = UAbyssDeck::BuildDeck(4); UAbyssDeck::Shuffle(Deck); }
    State.Player.Reset(); State.Dealer.Reset();
    State.Player.Add(Deck.Pop()); State.Dealer.Add(Deck.Pop());
    State.Player.Add(Deck.Pop()); State.Dealer.Add(Deck.Pop());
    State.Phase = EAbyssBJPhase::Play;
    if (UAbyssDeck::HandValue(State.Player) == 21) Finish(EAbyssBJOutcome::Blackjack);
}

void UAbyssBlackjack::Hit()
{
    if (State.Phase != EAbyssBJPhase::Play) return;
    State.Player.Add(Deck.Pop());
    if (UAbyssDeck::HandValue(State.Player) > 21) Finish(EAbyssBJOutcome::Bust);
}

void UAbyssBlackjack::Stand()
{
    if (State.Phase != EAbyssBJPhase::Play) return;
    State.Phase = EAbyssBJPhase::Dealer;
}

void UAbyssBlackjack::AdvanceDealer()
{
    if (State.Phase != EAbyssBJPhase::Dealer) return;
    const int32 Dv = UAbyssDeck::HandValue(State.Dealer);
    if (Dv < 17) { State.Dealer.Add(Deck.Pop()); return; }

    const int32 Pv = UAbyssDeck::HandValue(State.Player);
    const int32 Final = UAbyssDeck::HandValue(State.Dealer);
    if (Final > 21 || Pv > Final) Finish(EAbyssBJOutcome::Win);
    else if (Pv < Final) Finish(EAbyssBJOutcome::Lose);
    else Finish(EAbyssBJOutcome::Push);
}

void UAbyssBlackjack::Finish(EAbyssBJOutcome Outcome)
{
    State.Outcome = Outcome;
    State.Phase = EAbyssBJPhase::Done;
    switch (Outcome)
    {
        case EAbyssBJOutcome::Blackjack: State.LastDelta = FMath::RoundToInt(State.Bet * 1.5f); break;
        case EAbyssBJOutcome::Win:       State.LastDelta = State.Bet; break;
        case EAbyssBJOutcome::Push:      State.LastDelta = 0; break;
        case EAbyssBJOutcome::Lose:
        case EAbyssBJOutcome::Bust:      State.LastDelta = -State.Bet; break;
        default: break;
    }
}
