export const censorPassword = (password: string) => {
  if (!password) return password;
  
  const censorLength = Math.floor(password.length * 0.7);
  const start = Math.floor(
    Math.random() * (password.length - censorLength + 1)
  );
  const end = start + censorLength;
  return (
    password.substring(0, start) +
    "*".repeat(censorLength) +
    password.substring(end)
  );
  
};

export const getSummaryName = (name: string) => {
  const normalized = name.trim();
  const parts = normalized.split(/\s+/);
  const isSpaceName = parts[1]; // Minh Trí => ["Minh", "Trí"]

  if (isSpaceName !== undefined) {
    const lastName = parts[parts.length - 1];
    return lastName?.charAt(0) ?? '';
  }

  return normalized.charAt(0); // Kyle => K
};

export const formatDateStr = (dateStr: string) => {
  const date = new Date(dateStr);

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const formattedTime = date.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "numeric",
  });

  const formattedDateTime = formattedDate + " " + formattedTime;
  return formattedDateTime;
};

