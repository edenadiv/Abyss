#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "AbyssCharacter.generated.h"

class UCameraComponent;

// AAbyssCharacter — first-person pawn.
//
// Uses *legacy* InputComponent bindings (BindAxis / BindAction) so WASD,
// mouse, Shift, E, Esc work without needing any editor-created input
// assets. The axis/action names match DefaultInput.ini:
//   AxisMappings:   MoveForward, MoveRight, Turn, LookUp
//   ActionMappings: Sprint, Interact, Pause, Jump
//
// When we later add UInputMappingContext + UInputAction assets (for
// rebindable keys in Settings), Enhanced Input will run on top of this
// without breaking the default controls.

UCLASS(Blueprintable, BlueprintType)
class ABYSS_API AAbyssCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AAbyssCharacter();

    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(UInputComponent* InputComponent) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Abyss") UCameraComponent* Camera;

    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") float WalkSpeed   = 520.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") float SprintSpeed = 860.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") float MouseSensitivity = 1.0f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") bool bInvertY = false;

    UFUNCTION(BlueprintImplementableEvent, Category="Abyss")
    void OnPauseRequested();

    UFUNCTION(BlueprintImplementableEvent, Category="Abyss")
    void OnInteractRequested();

private:
    void MoveForward(float Value);
    void MoveRight(float Value);
    void Turn(float Value);
    void LookUp(float Value);
    void SprintStart();
    void SprintStop();
    void Interact();
    void Pause();
};
