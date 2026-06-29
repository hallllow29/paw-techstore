// Padrões de validação reutilizados nos formulários do cliente.
// O servidor revalida sempre estes campos (defesa em profundidade).

// Telemóvel português: 9 dígitos a começar por 9, com +351 opcional.
export const PHONE_PATTERN = /^(\+351\s?)?9\d{8}$/;

// NIF: exatamente 9 dígitos.
export const NIF_PATTERN = /^\d{9}$/;
