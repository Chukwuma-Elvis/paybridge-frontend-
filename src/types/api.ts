import type { components, paths } from '../api/generated/schema';

export type Schemas = components['schemas'];
export type Paths = paths;

export type CustomerResponse = Schemas['CustomerResponse'];
export type CreateCustomerRequest = Schemas['CreateCustomerRequest'];
export type UpdateKycTierRequest = Schemas['UpdateKycTierRequest'];
export type KycTier = Schemas['KycTier'];

export type AccountResponse = Schemas['AccountResponse'];
export type OpenAccountRequest = Schemas['OpenAccountRequest'];
export type StatementLineResponse = Schemas['StatementLineResponse'];
export type FundAccountRequest = Schemas['FundAccountRequest'];

export type TransferResponse = Schemas['TransferResponse'];
export type InternalTransferRequest = Schemas['InternalTransferRequest'];
export type ExternalTransferRequest = Schemas['ExternalTransferRequest'];
export type ResolvedAccount = Schemas['ResolvedAccount'];
export type BeneficiaryView = Schemas['BeneficiaryView'];

export type CurrentRate = Schemas['CurrentRate'];
export type Quote = Schemas['Quote'];
export type Conversion = Schemas['Conversion'];
export type RateResponse = Schemas['RateResponse'];
export type Corridor = Schemas['Corridor'];

export type RemittanceView = Schemas['RemittanceView'];
export type CreateRemittanceRequest = Schemas['CreateRemittanceRequest'];
export type RemittanceStatus = Schemas['RemittanceStatus'];

export type CaseView = Schemas['CaseView'];
export type CaseStatus = Schemas['CaseStatus'];
export type LimitStatus = Schemas['LimitStatus'];

export type BatchView = Schemas['BatchView'];
export type BatchLineView = Schemas['BatchLineView'];
export type BatchReport = Schemas['BatchReport'];
export type StatementResult = Schemas['StatementResult'];
export type BreakView = Schemas['BreakView'];
export type Position = Schemas['Position'];

export type ApiKeyResponse = Schemas['ApiKeyResponse'];
export type CreatedApiKeyResponse = Schemas['CreatedApiKeyResponse'];
export type ApiKeyRole = Schemas['ApiKeyRole'];

export type SystemInfoResponse = Schemas['SystemInfoResponse'];
export type LogLine = Schemas['LogLine'];
export type ProblemDetail = Schemas['ProblemDetail'];
