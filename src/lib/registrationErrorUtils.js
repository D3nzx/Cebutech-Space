export function getRegistrationErrorDetails(error) {
  const rawMessage = typeof error === 'string'
    ? error
    : error?.message || 'Registration failed. Please try again or contact support if the problem persists.';

  const combined = `${rawMessage} ${error?.status || ''}`.toLowerCase();

  if (
    error?.status === 429 ||
    combined.includes('too many requests') ||
    combined.includes('rate limit') ||
    combined.includes('email rate limit') ||
    combined.includes('error sending confirmation email') ||
    combined.includes('signup is temporarily disabled')
  ) {
    return {
      title: 'Too Many Attempts',
      message: 'Too many sign-up attempts from this device. Please wait a few minutes and try again.'
    };
  }

  if (
    combined.includes('already registered') ||
    combined.includes('already exists') ||
    combined.includes('user already registered') ||
    combined.includes('duplicate key') ||
    combined.includes('account already exists')
  ) {
    return {
      title: 'Account Already Exists',
      message: 'An account with this email address already exists. Please use a different email.'
    };
  }

  if (
    combined.includes('row level security') ||
    combined.includes('database permissions') ||
    combined.includes('permission denied') ||
    combined.includes('permission denied for table')
  ) {
    return {
      title: 'Database Configuration Error',
      message: 'Unable to complete registration due to database configuration. Please contact your administrator.'
    };
  }

  if (
    combined.includes('check constraint') ||
    combined.includes('program_heads_college_program_valid') ||
    combined.includes('invalid college') ||
    combined.includes('invalid program') ||
    combined.includes('invalid selection')
  ) {
    return {
      title: 'Invalid Selection',
      message: 'The selected college and program combination is not valid. Please choose a valid option.'
    };
  }

  if (
    combined.includes('invalid') ||
    combined.includes('password') ||
    combined.includes('email is required') ||
    combined.includes('please enter a valid email')
  ) {
    return {
      title: 'Invalid Information',
      message: rawMessage
    };
  }

  return {
    title: 'Registration Error',
    message: rawMessage
  };
}
