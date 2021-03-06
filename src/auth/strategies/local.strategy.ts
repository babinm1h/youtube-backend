import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-local"
import { AuthService } from "../auth.service"

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {

    constructor(private AuthService: AuthService) {
        super({
            usernameField: "email",
            passwordField: "password"
        })
    }

    async validate(email: string, password: string) {
        const user = await this.AuthService.validateUser({ email, password })
        if (!user) throw new UnauthorizedException('Local strategy validate error')
        return user
    }

}