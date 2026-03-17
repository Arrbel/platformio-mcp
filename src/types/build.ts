export interface BuildResult {
  success: boolean;
  environment: string;
  resolvedEnvironment?: string;
  resolutionSource?: string;
  output: string;
  errors?: string[];
}

export interface CleanResult {
  success: boolean;
  message: string;
}
