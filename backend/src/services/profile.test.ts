import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../types';
import { duplicateMessage, isValidCellphone, isValidCpf, missingFields, profileUpdate, ProfileError } from './profile';

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
  assert.throws(() => profileUpdate({ avatar: 'robo' }), ProfileError);
  assert.deepEqual(profileUpdate({ avatar: null, avatarColor: 'verde' }), { avatar: null, avatar_color: 'verde' });
  assert.throws(() => profileUpdate({}), ProfileError);
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
