import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../types';
import { duplicateMessage, isValidCellphone, isValidCpf, isValidPhone, missingFields, profileUpdate, ProfileError } from './profile';

test('CPF: dígitos verificadores', () => {
  assert.ok(isValidCpf('529.982.247-25'));
  assert.ok(isValidCpf('52998224725'));
  assert.ok(!isValidCpf('529.982.247-24'));
  assert.ok(!isValidCpf('111.111.111-11'));
  assert.ok(!isValidCpf('5299822472'));
});

test('celular: DDD existente e 9 na frente', () => {
  assert.ok(isValidCellphone('(15) 99123-4567'));
  assert.ok(!isValidCellphone('(15) 3212-3456'), 'fixo não vale');
  assert.ok(!isValidCellphone('(20) 99123-4567'), 'DDD 20 não existe');
  assert.ok(!isValidCellphone('15 8912-34567'));
});

test('PATCH /me: só os campos enviados; a CNH não é mais pedida', () => {
  assert.deepEqual(profileUpdate({ phone: '(15) 99123-4567', theme: 'night' }), {
    phone: '15991234567',
    theme: 'night'
  });
  assert.throws(() => profileUpdate({ cnh: { number: '52601815980', category: 'B', expiresOn: '2030-01-01' } }), /não é mais pedida/);
  assert.throws(() => profileUpdate({ cpf: null }), ProfileError);
  assert.deepEqual(profileUpdate({ avatarPhoto: null, avatarColor: 'verde' }), { avatar_photo: null, avatar_color: 'verde' });
  assert.throws(() => profileUpdate({}), ProfileError);
});

test('foto do perfil: só da pasta da própria pessoa no Storage', () => {
  assert.deepEqual(profileUpdate({ avatarPhoto: 'u1/1730300000.webp' }, 'u1'), { avatar_photo: 'u1/1730300000.webp' });
  assert.throws(() => profileUpdate({ avatarPhoto: 'u2/1730300000.webp' }, 'u1'), /Foto inválida/);
  assert.throws(() => profileUpdate({ avatarPhoto: 'https://outro.site/u1/a.webp' }, 'u1'), /Foto inválida/);
  assert.throws(() => profileUpdate({ avatarPhoto: 'u1/../u2/a.webp' }, 'u1'), /Foto inválida/);
  assert.throws(() => profileUpdate({ avatarPhoto: 'u1/a.webp' }), /Foto inválida/);
});

test('cadastro incompleto e duplicados', () => {
  const base = { id: 'x', full_name: 'Ana Souza' };
  assert.deepEqual(missingFields({ ...base, role: UserRole.OPERADOR }), ['cpf', 'phone']);
  // Motorista com CPF e celular já está completo (a CNH deixou de ser pedida)
  assert.deepEqual(missingFields({ ...base, role: UserRole.MOTORISTA, cpf: '52998224725', phone: '15991234567' }), []);
  assert.equal(duplicateMessage({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_cpf_key"' }),
    'Este CPF já está cadastrado em outra conta.');
  assert.equal(duplicateMessage({ code: '42703', message: 'column does not exist' }), null);
});

test('telefone de quem liga: celular com 9 ou fixo de 2 a 5, com DDD existente', () => {
  assert.equal(isValidPhone('(15) 99123-4567'), true);
  assert.equal(isValidPhone('(15) 3232-1234'), true);
  assert.equal(isValidPhone('(15) 9123-4567'), false); // 10 dígitos começando com 9: celular sem o 9 da frente
  assert.equal(isValidPhone('(15) 3232-12345'), false);
  assert.equal(isValidPhone('(20) 3232-1234'), false);
});
