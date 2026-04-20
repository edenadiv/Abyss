#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "AbyssCharacter.generated.h"

class UCameraComponent;
class UInputMappingContext;
class UInputAction;
struct FInputActionValue;

/* AAbyssCharacter — first-person pawn. Enhanced Input mappings live in
   a UInputMappingContext asset created in the editor; the C++ side
   exposes the context + actions as UPROPERTYs so Blueprints can drop
   existing assets in without recompiling. */

UCLASS(Blueprintable, BlueprintType)
class ABYSS_API AAbyssCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    AAbyssCharacter();

    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(UInputComponent* InputComponent) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Abyss") UCameraComponent* Camera;

    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Input") UInputMappingContext* DefaultMappingContext;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Input") UInputAction* IA_Look;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Input") UInputAction* IA_Move;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Input") UInputAction* IA_Sprint;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Input") UInputAction* IA_Interact;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Input") UInputAction* IA_Pause;

    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") float WalkSpeed   = 520.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") float SprintSpeed = 860.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") float MouseSensitivity = 1.0f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category="Abyss|Movement") bool bInvertY = false;

    /* Hook the Blueprint side can override for UI (e.g. flash prompt on pause). */
    UFUNCTION(BlueprintImplementableEvent, Category="Abyss")
    void OnPauseRequested();

    UFUNCTION(BlueprintImplementableEvent, Category="Abyss")
    void OnInteractRequested();

private:
    void HandleLook(const FInputActionValue& V);
    void HandleMove(const FInputActionValue& V);
    void HandleSprintStart();
    void HandleSprintStop();
    void HandleInteract();
    void HandlePause();
};
