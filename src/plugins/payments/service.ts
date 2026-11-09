// Rabasa owns. Obonyo calls these for bounty money; never call PayPal directly.
const todo = (name: string): never => { throw new Error(`${name} not implemented`); };

export async function createOrder(amount: string, payeeId: string): Promise<{ orderId: string; approvalUrl: string }> { return todo("createOrder"); }
export async function authorizeOrder(amount: string): Promise<{ orderId: string; approvalUrl: string }> { return todo("authorizeOrder"); }
export async function captureOrder(authorizationId: string): Promise<{ captureId: string }> { return todo("captureOrder"); }
export async function voidAuthorization(authorizationId: string): Promise<void> { return todo("voidAuthorization"); }
export async function payout(userId: string, amount: string): Promise<{ payoutBatchId: string }> { return todo("payout"); }
