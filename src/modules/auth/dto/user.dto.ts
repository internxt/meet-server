export interface UserTokenData {
  payload: {
    uuid: string;
    email: string;
    name: string;
    lastname: string;
    username: string;
    sharedWorkspace: boolean;
    networkCredentials: {
      user: string;
      pass: string;
    };
    workspaces: { owners: string[] };
  };
  iat: number;
  exp: number;
}
