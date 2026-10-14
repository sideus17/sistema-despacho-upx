import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../types';
import { duplicateMessage, isValidCellphone, isValidCnh, isValidCpf, missingFields, parseCnh, profileUpdate, ProfileError } from './profile';

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

test('CNH: dígitos verificadores', () => {
  assert.ok(isValidCnh('52601815980'));
  assert.ok(isValidCnh('08301661350'));
  assert.ok(!isValidCnh('52601815981'));
  assert.ok(!isValidCnh('00000000000'));
  // Base em que o segundo dígito ficaria negativo: nenhum número com ela é válido
  for (let dv = 0; dv < 100; dv++) assert.ok(!isValidCnh(`987654321${String(dv).padStart(2, '0')}`));
});

test('CNH: categoria e validade', () => {
  assert.deepEqual(parseCnh({ number: '526.018.159-80', category: 'ab', expiresOn: '2030-05-31' }), {
    number: '52601815980',
    category: 'AB',
    expiresOn: '2030-05-31'
  });
  assert.throws(() => parseCnh({ number: '52601815980', category: 'F', expiresOn: '2030-05-31' }), ProfileError);
  assert.throws(() => parseCnh({ number: '52601815980', category: 'B', expiresOn: '2030-02-30' }), ProfileError);
});

test('PATCH /me: só os campos enviados, CNH só para motorista', () => {
  assert.deepEqual(profileUpdate({ phone: '(15) 99123-4567', theme: 'night' }, UserRole.OPERADOR), {
    phone: '15991234567',
    theme: 'night'
  });
  assert.throws(() => profileUpdate({ cnh: { number: '52601815980', category: 'B', expiresOn: '2030-01-01' } }, UserRole.OPERADOR), ProfileError);
  assert.throws(() => profileUpdate({ cpf: null }, UserRole.MOTORISTA), ProfileError);
  assert.throws(() => profileUpdate({ avatar: 'robo' }, UserRole.MOTORISTA), ProfileError);
  assert.deepEqual(profileUpdate({ avatar: null, avatarColor: 'verde' }, UserRole.MOTORISTA), { avatar: null, avatar_color: 'verde' });
  assert.throws(() => profileUpdate({}, UserRole.MOTORISTA), ProfileError);
});

test('cadastro incompleto e duplicados', () => {
  const base = { id: 'x', full_name: 'Ana Souza' };
  assert.deepEqual(missingFields({ ...base, role: UserRole.OPERADOR }), ['cpf', 'phone']);
  assert.deepEqual(missingFields({ ...base, role: UserRole.MOTORISTA, cpf: '52998224725', phone: '15991234567' }), ['cnh']);
  assert.equal(duplicateMessage({ code: '23505', message: 'duplicate key value violates unique constraint "profiles_cpf_key"' }),
    'Este CPF já está cadastrado em outra conta.');
  assert.equal(duplicateMessage({ code: '23505', message: '... "profiles_cnh_number_key"' }), 'Esta CNH já está cadastrada em outra conta.');
  assert.equal(duplicateMessage({ code: '42703', message: 'column does not exist' }), null);
});
