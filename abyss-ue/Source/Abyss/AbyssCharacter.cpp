#include "AbyssCharacter.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "Components/InputComponent.h"

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
    GetCharacterMovement()->GravityScale = 1.5f;
    GetCharacterMovement()->JumpZVelocity = 520.f;
    JumpMaxCount = 1;
}

void AAbyssCharacter::BeginPlay()
{
    Super::BeginPlay();
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;

    // Lock the mouse to the viewport and hide the cursor for FPS feel.
    if (APlayerController* PC = Cast<APlayerController>(Controller))
    {
        PC->bShowMouseCursor = false;
        PC->SetInputMode(FInputModeGameOnly());
    }
}

void AAbyssCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    if (!PlayerInputComponent) return;

    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &AAbyssCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"),   this, &AAbyssCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("Turn"),        this, &AAbyssCharacter::Turn);
    PlayerInputComponent->BindAxis(TEXT("LookUp"),      this, &AAbyssCharacter::LookUp);

    PlayerInputComponent->BindAction(TEXT("Sprint"),   IE_Pressed,  this, &AAbyssCharacter::SprintStart);
    PlayerInputComponent->BindAction(TEXT("Sprint"),   IE_Released, this, &AAbyssCharacter::SprintStop);
    PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed,  this, &AAbyssCharacter::Interact);
    PlayerInputComponent->BindAction(TEXT("Pause"),    IE_Pressed,  this, &AAbyssCharacter::Pause);
    PlayerInputComponent->BindAction(TEXT("Jump"),     IE_Pressed,  this, &ACharacter::Jump);
    PlayerInputComponent->BindAction(TEXT("Jump"),     IE_Released, this, &ACharacter::StopJumping);
}

void AAbyssCharacter::MoveForward(float Value)
{
    if (!Controller || FMath::IsNearlyZero(Value)) return;
    const FRotator Yaw(0, Controller->GetControlRotation().Yaw, 0);
    const FVector Fwd = FRotationMatrix(Yaw).GetUnitAxis(EAxis::X);
    AddMovementInput(Fwd, Value);
}

void AAbyssCharacter::MoveRight(float Value)
{
    if (!Controller || FMath::IsNearlyZero(Value)) return;
    const FRotator Yaw(0, Controller->GetControlRotation().Yaw, 0);
    const FVector Right = FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y);
    AddMovementInput(Right, Value);
}

void AAbyssCharacter::Turn(float Value)   { AddControllerYawInput(Value * MouseSensitivity); }
void AAbyssCharacter::LookUp(float Value) { AddControllerPitchInput(Value * MouseSensitivity * (bInvertY ? -1.f : 1.f)); }

void AAbyssCharacter::SprintStart() { GetCharacterMovement()->MaxWalkSpeed = SprintSpeed; }
void AAbyssCharacter::SprintStop()  { GetCharacterMovement()->MaxWalkSpeed = WalkSpeed; }
void AAbyssCharacter::Interact()    { OnInteractRequested(); }
void AAbyssCharacter::Pause()       { OnPauseRequested(); }
