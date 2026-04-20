#include "AbyssCharacter.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputMappingContext.h"
#include "InputAction.h"

AAbyssCharacter::AAbyssCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    GetCapsuleComponent()->InitCapsuleSize(35.f, 88.f);

    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(GetCapsuleComponent());
    Camera->SetRelativeLocation(FVector(0.f, 0.f, 70.f));
    Camera->bUsePawnControlRotation = true;
    Camera->FieldOfView = 90.f;

    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = true;
    bUseControllerRotationRoll = false;

    GetCharacterMovement()->bOrientRotationToMovement = false;
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
    GetCharacterMovement()->MinAnalogWalkSpeed = 20.f;
    GetCharacterMovement()->BrakingDecelerationWalking = 2000.f;
}

void AAbyssCharacter::BeginPlay()
{
    Super::BeginPlay();
    if (APlayerController* PC = Cast<APlayerController>(Controller))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
        {
            if (DefaultMappingContext) Subsystem->AddMappingContext(DefaultMappingContext, 0);
        }
    }
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}

void AAbyssCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    if (UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        if (IA_Look)     Input->BindAction(IA_Look,     ETriggerEvent::Triggered, this, &AAbyssCharacter::HandleLook);
        if (IA_Move)     Input->BindAction(IA_Move,     ETriggerEvent::Triggered, this, &AAbyssCharacter::HandleMove);
        if (IA_Sprint)   Input->BindAction(IA_Sprint,   ETriggerEvent::Started,   this, &AAbyssCharacter::HandleSprintStart);
        if (IA_Sprint)   Input->BindAction(IA_Sprint,   ETriggerEvent::Completed, this, &AAbyssCharacter::HandleSprintStop);
        if (IA_Interact) Input->BindAction(IA_Interact, ETriggerEvent::Started,   this, &AAbyssCharacter::HandleInteract);
        if (IA_Pause)    Input->BindAction(IA_Pause,    ETriggerEvent::Started,   this, &AAbyssCharacter::HandlePause);
    }
}

void AAbyssCharacter::HandleLook(const FInputActionValue& V)
{
    const FVector2D L = V.Get<FVector2D>();
    AddControllerYawInput(L.X * MouseSensitivity);
    AddControllerPitchInput(L.Y * MouseSensitivity * (bInvertY ? -1.f : 1.f));
}

void AAbyssCharacter::HandleMove(const FInputActionValue& V)
{
    const FVector2D M = V.Get<FVector2D>();
    if (Controller)
    {
        const FRotator Yaw(0, Controller->GetControlRotation().Yaw, 0);
        const FVector Fwd = FRotationMatrix(Yaw).GetUnitAxis(EAxis::X);
        const FVector Right = FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y);
        AddMovementInput(Fwd,   M.Y);
        AddMovementInput(Right, M.X);
    }
}

void AAbyssCharacter::HandleSprintStart() { GetCharacterMovement()->MaxWalkSpeed = SprintSpeed; }
void AAbyssCharacter::HandleSprintStop()  { GetCharacterMovement()->MaxWalkSpeed = WalkSpeed; }
void AAbyssCharacter::HandleInteract()    { OnInteractRequested(); }
void AAbyssCharacter::HandlePause()       { OnPauseRequested(); }
