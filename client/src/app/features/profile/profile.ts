import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AddressInput } from '../../shared/address-input/address-input';
import { imageUrl } from '../../core/config';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, AddressInput],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  readonly img = imageUrl;

  readonly perfilMsg = signal<string | null>(null);
  readonly savingPerfil = signal(false);
  readonly pwdMsg = signal<string | null>(null);
  readonly pwdError = signal<string | null>(null);
  readonly savingPwd = signal(false);
  readonly avatarMsg = signal<string | null>(null);
  readonly uploadingAvatar = signal(false);

  readonly perfilForm = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    morada: ['', Validators.required],
    telefone: ['', Validators.required],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', Validators.required],
  });

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) {
      this.perfilForm.patchValue({ nome: u.nome, morada: u.morada, telefone: u.telefone });
    }
  }

  onAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingAvatar.set(true);
    this.avatarMsg.set(null);
    this.auth.uploadAvatar(file).subscribe({
      next: () => {
        this.uploadingAvatar.set(false);
        this.avatarMsg.set('Foto de perfil atualizada.');
      },
      error: () => this.uploadingAvatar.set(false),
    });
    input.value = '';
  }

  guardarPerfil(): void {
    if (this.perfilForm.invalid) return;
    this.savingPerfil.set(true);
    this.perfilMsg.set(null);
    this.auth.updateProfile(this.perfilForm.getRawValue()).subscribe({
      next: () => {
        this.savingPerfil.set(false);
        this.perfilMsg.set('Dados atualizados.');
      },
      error: () => this.savingPerfil.set(false),
    });
  }

  alterarPassword(): void {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmar } = this.passwordForm.getRawValue();
    if (newPassword !== confirmar) {
      this.pwdError.set('As passwords não coincidem.');
      return;
    }
    this.savingPwd.set(true);
    this.pwdError.set(null);
    this.pwdMsg.set(null);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.pwdMsg.set('Password alterada com sucesso.');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.savingPwd.set(false);
        this.pwdError.set(err?.error?.message ?? 'Não foi possível alterar a password.');
      },
    });
  }
}
