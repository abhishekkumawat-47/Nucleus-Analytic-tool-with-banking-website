package com.nexabank.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexabank.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "\"Customer\"")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phone;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"customerType\"", nullable = false)
    @Builder.Default
    private CustomerType customerType = CustomerType.INDIVIDUAL;

    @Column(name = "\"dateOfBirth\"", nullable = false)
    private LocalDateTime dateOfBirth;

    @Column(nullable = false, unique = true)
    private String pan;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "\"settingConfig\"", columnDefinition = "jsonb")
    private Map<String, Object> settingConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CustomerRole role = CustomerRole.USER;

    @Column(name = "\"tenantId\"", nullable = false)
    @Builder.Default
    private String tenantId = "bank_a";

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "\"tenantId\"", insertable = false, updatable = false)
    private Tenant tenant;

    @JsonIgnore
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Account> accounts;

    @JsonIgnore
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Event> events;

    @JsonIgnore
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LoanApplication> loanApplications;

    @JsonIgnore
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserLocation> locations;

    @JsonIgnore
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<UserLicense> licenses;

    @Enumerated(EnumType.STRING)
    @Column(name = "\"kycStatus\"", nullable = false)
    @Builder.Default
    private KycStatus kycStatus = KycStatus.NOT_STARTED;

    @Column(name = "\"kycCompletedAt\"")
    private LocalDateTime kycCompletedAt;

    @Column(name = "\"lastLogin\"")
    private LocalDateTime lastLogin;
}
