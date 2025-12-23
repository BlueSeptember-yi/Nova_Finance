"""
Create super admin account script

Usage:
    python -m scripts.create_super_admin [username] [password]

Arguments:
    username: Optional, defaults to 'superadmin'
    password: Optional, auto-generated 12-character random password if not provided

Examples:
    # Use default configuration
    python -m scripts.create_super_admin

    # Specify username, password auto-generated
    python -m scripts.create_super_admin myadmin

    # Specify both username and password
    python -m scripts.create_super_admin myadmin MyPassword123!
"""

import os
import sys
import warnings

# Suppress bcrypt version reading warning (does not affect functionality)
warnings.filterwarnings("ignore", message=".*bcrypt.*", category=UserWarning)

# Add project root directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import after path setup (required for script execution)
from app.database import SessionLocal  # noqa: E402, F401
from app.models.user import User  # noqa: E402, F401
from app.utils.auth import (  # noqa: E402, F401
    generate_random_password,
    get_password_hash,
)
from sqlalchemy.orm import Session  # noqa: E402, F401


def create_super_admin(username: str = None, password: str = None) -> dict:
    """Create super admin account"""
    db: Session = SessionLocal()

    try:
        # Check if super admin already exists
        existing_super_admin = db.query(User).filter(User.role == "SuperAdmin").first()
        if existing_super_admin:
            print(f"Super admin already exists: {existing_super_admin.username}")
            return {
                "success": False,
                "message": "Super admin already exists",
                "username": existing_super_admin.username,
            }

        # Determine username
        if not username:
            username = "superadmin"

        # Check if username already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            # Generate unique username if default username exists
            import uuid

            username = f"superadmin_{uuid.uuid4().hex[:8]}"
            print(f"Default username exists, using new username: {username}")

        # Generate password
        if not password:
            password = generate_random_password(12)

        # Create super admin
        super_admin = User(
            username=username,
            password_hash=get_password_hash(password),
            role="SuperAdmin",
            company_id=None,  # Super admin does not belong to any company
        )

        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)

        # Display creation result
        print("=" * 60)
        print("Super admin account created successfully!")
        print("=" * 60)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print("Role: SuperAdmin")
        print("=" * 60)
        print("Please keep the password safe and change it after first login!")
        print("=" * 60)

        return {
            "success": True,
            "username": username,
            "password": password,
            "user_id": super_admin.user_id,
        }

    except Exception as e:  # pylint: disable=broad-except
        db.rollback()
        print(f"Failed to create super admin: {str(e)}")
        return {
            "success": False,
            "message": str(e),
        }
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Create super admin account",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "username",
        nargs="?",
        default=None,
        help="Super admin username (optional, defaults to 'superadmin')",
    )
    parser.add_argument(
        "password",
        nargs="?",
        default=None,
        help="Super admin password (optional, auto-generated if not provided)",
    )

    args = parser.parse_args()
    result = create_super_admin(args.username, args.password)

    if not result.get("success"):
        sys.exit(1)
