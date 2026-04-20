#include "AbyssPoker.h"

void UAbyssPoker::Reset()
{
    Deck = UAbyssDeck::BuildDeck(1);
    UAbyssDeck::Shuffle(Deck);
    State = FAbyssPokerState();
}

bool UAbyssPoker::PlaceAnte(int32 Amount)
{
    if (State.Phase != EAbyssPokerPhase::Ante || Amount <= 0) return false;
    State.Ante = Amount;
    State.Phase = EAbyssPokerPhase::Deal;
    return true;
}

void UAbyssPoker::Deal()
{
    if (State.Phase != EAbyssPokerPhase::Deal) return;
    State.Hand.Reset(); State.Dealer.Reset();
    for (int32 i = 0; i < 5; ++i) { State.Hand.Add(Deck.Pop()); State.Dealer.Add(Deck.Pop()); }
    State.Phase = EAbyssPokerPhase::Draw;
}

void UAbyssPoker::Draw(const TArray<int32>& DiscardIndices)
{
    if (State.Phase != EAbyssPokerPhase::Draw) return;
    TArray<int32> Sorted = DiscardIndices;
    Sorted.Sort([](int32 A, int32 B) { return A > B; });
    for (int32 Idx : Sorted)
    {
        if (Idx >= 0 && Idx < State.Hand.Num()) State.Hand[Idx] = Deck.Pop();
    }
    // Ghost dealer swaps 2 low cards.
    int32 Swapped = 0;
    for (int32 i = 0; i < State.Dealer.Num() && Swapped < 2; ++i)
    {
        if (State.Dealer[i].Rank == TEXT("2") || State.Dealer[i].Rank == TEXT("3") || State.Dealer[i].Rank == TEXT("4"))
        {
            State.Dealer[i] = Deck.Pop();
            ++Swapped;
        }
    }
    State.Phase = EAbyssPokerPhase::Showdown;
    Showdown();
}

void UAbyssPoker::Showdown()
{
    State.PlayerRank = UAbyssDeck::PokerEvaluate(State.Hand);
    State.DealerRank = UAbyssDeck::PokerEvaluate(State.Dealer);
    const int32 PS = State.PlayerRank.Score;
    const int32 DS = State.DealerRank.Score;
    if (PS > DS)      { State.LastDelta = State.Ante * 2; State.Outcome = TEXT("WON — ") + State.PlayerRank.Name; }
    else if (PS < DS) { State.LastDelta = -State.Ante;     State.Outcome = TEXT("LOST — dealer had ") + State.DealerRank.Name; }
    else              { State.LastDelta = 0;               State.Outcome = TEXT("PUSH"); }
    State.Phase = EAbyssPokerPhase::Done;
}
